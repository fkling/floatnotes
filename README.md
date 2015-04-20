### Maintenance mode

This addon/project is not actively developed anymore! I will try to provide bug
fixes in case it breaks in future FF versions, but I'm not planning to
implement any new features.

However, I'm happy to review PRs for new or improved features.

----

# FloatNotes

## Summary

This extension makes it possible to create small notes on any web site. It is basic
in functionality and design but has some valuable features:

- Markdown support: You can use Markdown to format the text of the note.
- Notes indicator: When scrolling on a web site, small labes at the top and
 the bottom of the page show how many notes are above or below the current view.
 You can also jump directly to a specific note via this lables.
- Minimizing notes: Notes can be minimized via a double click on the drag handler.
- Hide notes: All notes can be hidden with a single click.
- Simple design: To fit into any page easily and to not gain to much "attention",
 the design of the notes is kept very simple.
- Locations: Specify the scope of a note.
- Pin notes: Pin notes to the window so that they don't move with the website
- Cross tab and window updates: Changes to notes are immediately refectled in other tabs/windows
- Synchronisation: FloatNotes integreates with Firefox Sync to sync your notes across computers
- Notes Manager: Search, see and edit all notes.

For more information, please see [www.floatnotes.org](http://www.floatnotes.org).


## Libraries

This extension uses the following libraries:

- [Showdown](https://github.com/showdownjs/showdown): A JavaScript Markdown parser
- [when](https://github.com/cujojs/when): A Promise implementation


## Usage instructions

1. Create a note  
  To create a note, right-click at the location where the note should show up
  and select "Create note...". A new note appears at this location and   
2. Move and resize a note
 Move the cursor over the note. At the bottom occurs a grey bar which is the drag
 handler. Click on it and hold the mouse button down to move the note around.  
 While hovering over the note, a resize handler appears in the lower right corner
 of the note.
 
3. Edit a note
 You can easily edit a note by double clicking on it. To indicate, that the note 
 is in edit mode, the border color and the color of the drag and resize handlers 
 change to red.  
 You can use Markdown to format the text.  
 Click somewhere on the web site to save the changes.
 
4. Delete a note
  Select "Delete" from the note's menu  

## About "locations" / scope
 
 A web site might exist of several sub pages. By default, a note only exists on
 the page it was created. But this can be changed and a note show up on any page
 that lies in a certain path.
 
 Example:
 Lets assume I create a note on this page, http://github.com/fkling/floatnotes.
 Later, I decide that this note should be displayed on any of my projects pages.
 That means the note should show up for any page which URL starts with 
 http://github.com/fkling/.
 Or maybe I even to to show a note on any site of github.com.
 
 To change the location of a note, click "Settings" in the notes menu and select another location.
